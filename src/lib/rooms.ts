'use client';

import { getFirebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
  collection,
  getDoc,
  addDoc,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { faker } from '@faker-js/faker';
import { type Role, type Character, ROLES } from './characters';

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
const db = getFirestore(app);

export interface Room {
  id: string;
  hostId: string;
  status: 'lobby' | 'drafting' | 'voting' | 'finished';
  createdAt: any;
  turnOrder?: string[];
  currentPlayerId?: string;
  playerCount: 1 | 2 | 4;
  players: {id: string, displayName: string}[];
}

export interface Player {
  id: string; // This will be the user's UID
  displayName: string;
}

export interface DraftPick {
  id: string;
  playerId: string;
  role: string | null;
  characterName: string;
  characterDescription: string;
  characterImageUrl: string;
}

export interface Vote {
  id: string;
  voterId: string;
  targetPlayerId: string;
  score: number;
}

/**
 * Creates a new room in Firestore.
 * @param hostId The UID of the user creating the room.
 * @param displayName The display name of the host.
 * @returns The 5-character room ID.
 */
export async function createRoom(
  hostId: string,
  displayName?: string
): Promise<string> {
  const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
  const roomRef = doc(db, 'rooms', roomId);
  
  const hostPlayer = {
    id: hostId,
    displayName: displayName || generateFunnyName(),
  };

  const roomData: Room = {
    id: roomId,
    hostId,
    status: 'lobby',
    createdAt: serverTimestamp(),
    playerCount: 1, // Default to 1 player
    players: [hostPlayer]
  };

  const playerRef = doc(db, `rooms/${roomId}/players`, hostId);
  const playerData: Player = {
    id: hostId,
    displayName: hostPlayer.displayName,
  };

  try {
    const batch = writeBatch(db);
    batch.set(roomRef, roomData);
    batch.set(playerRef, playerData);
    await batch.commit();
  } catch (err) {
    const permissionError = new FirestorePermissionError({
      path: roomRef.path,
      operation: 'create',
      requestResourceData: { room: roomData, player: playerData },
    });
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  }

  return roomId;
}

function generateFunnyName() {
  return faker.person.firstName() + ' ' + faker.animal.type();
}

/**
 * Adds a player to a room in Firestore.
 * @param roomId The ID of the room to join.
 * @param user The user object of the player joining.
 * @param displayName The optional display name for the player.
 */
export async function addPlayerToRoom(
  roomId: string,
  user: User,
  displayName?: string
) {
  if (!user) return;
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) throw new Error("Room does not exist");
  
  const roomData = roomSnap.data() as Room;
  
  const newPlayer: Player = {
    id: user.uid,
    displayName: displayName || user.displayName || generateFunnyName(),
  };

  // Ensure player isn't already in the list
  if (!roomData.players.some(p => p.id === newPlayer.id)) {
      const updatedPlayers = [...roomData.players, newPlayer];
      
      const batch = writeBatch(db);
      
      // Update players array in the main room document
      batch.update(roomRef, { players: updatedPlayers });

      // Create the player sub-collection document
      const playerDocRef = doc(db, `rooms/${roomId}/players`, user.uid);
      batch.set(playerDocRef, newPlayer);

      await batch.commit().catch((err) => {
        const permissionError = new FirestorePermissionError({
            path: roomRef.path,
            operation: 'update',
            requestResourceData: { players: updatedPlayers },
        });
        errorEmitter.emit('permission-error', permissionError);
        throw err;
      });
  }
}


/**
 * Lets a user join a room, which involves adding them as a player.
 * @param roomId The ID of the room to join.
 * @param user The user object.
 * @param displayName The optional display name for the player.
 */
export async function joinRoom(
  roomId: string,
  user: User,
  displayName?: string
) {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error('Room not found');
  }

  const roomData = roomSnap.data() as Room;

  if (roomData.players.length >= roomData.playerCount) {
    if (!roomData.players.some(p => p.id === user.uid)) {
      throw new Error('Room is full');
    }
  }

  await addPlayerToRoom(roomId, user, displayName);
}

/**
 * Updates the room status to 'drafting' to start the game.
 * @param roomId The ID of the room to start.
 */
export async function startGame(roomId: string, players: Player[]) {
  const roomRef = doc(db, 'rooms', roomId);
  const turnOrder = players.map((p) => p.id).sort(() => Math.random() - 0.5);

  await updateDoc(roomRef, {
    status: 'drafting',
    turnOrder: turnOrder,
    currentPlayerId: turnOrder[0], // Start with the first player
  }).catch((err) => {
    const permissionError = new FirestorePermissionError({
      path: roomRef.path,
      operation: 'update',
      requestResourceData: { status: 'drafting' },
    });
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  });
}

export async function selectCharacterForPlayer(
  roomId: string,
  playerId: string,
  role: string,
  characterName: string,
  characterDescription: string,
  characterImageUrl: string,
  turnOrder: string[],
  playerCount: number
) {
  const batch = writeBatch(db);
  const roomRef = doc(db, 'rooms', roomId);

  const draftPickRef = doc(collection(db, `rooms/${roomId}/draftPicks`));
  const draftPickData = {
    playerId,
    role,
    characterName,
    characterDescription,
    characterImageUrl,
  };
  batch.set(draftPickRef, draftPickData);

  // --- Start: Turn Progression Logic ---
  const currentIndex = turnOrder.indexOf(playerId);
  const nextPlayerIndex = (currentIndex + 1) % turnOrder.length;
  const nextPlayerId = turnOrder[nextPlayerIndex];

  // Check if all crews are full AFTER this pick
  const picksSnapshot = await getDocs(collection(db, `rooms/${roomId}/draftPicks`));
  const totalPicksAfterThisOne = picksSnapshot.docs.length + 1;
  const totalPicksNeeded = playerCount * ROLES.length;

  if (totalPicksAfterThisOne >= totalPicksNeeded) {
    // All characters drafted, stop turns. Players can now swap roles.
    batch.update(roomRef, { currentPlayerId: null });
  } else {
    // Continue to next player's turn
    batch.update(roomRef, { currentPlayerId: nextPlayerId });
  }
  // --- End: Turn Progression Logic ---

  await batch.commit().catch((err) => {
    const permissionError = new FirestorePermissionError({
      path: `rooms/${roomId}/draftPicks`,
      operation: 'create',
      requestResourceData: draftPickData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  });
}

export async function finishDrafting(
  roomId: string,
) {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;
  
  const room = roomSnap.data() as Room;
  const newStatus = room.playerCount === 1 ? 'finished' : 'voting';
  
  await updateDoc(roomRef, { 
    status: newStatus,
  }).catch((err) => {
    const permissionError = new FirestorePermissionError({
      path: roomRef.path,
      operation: 'update',
      requestResourceData: { status: newStatus },
    });
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  });
}


export async function swapCharacterRoles(
  roomId: string,
  pick1Id: string,
  pick1Role: Role,
  pick2Id: string | null,
  pick2Role: Role | null,
) {
    const batch = writeBatch(db);
    
    const pick1Ref = doc(db, `rooms/${roomId}/draftPicks`, pick1Id);
    batch.update(pick1Ref, { role: pick2Role });

    if (pick2Id && pick1Role) {
      const pick2Ref = doc(db, `rooms/${roomId}/draftPicks`, pick2Id);
      batch.update(pick2Ref, { role: pick1Role });
    }

    await batch.commit().catch((err) => {
        const permissionError = new FirestorePermissionError({
            path: `rooms/${roomId}/draftPicks`,
            operation: 'update',
            requestResourceData: { swap: [pick1Id, pick2Id] },
        });
        errorEmitter.emit('permission-error', permissionError);
        throw err;
    });
}


export async function randomizeCrew(
  roomId: string,
  playerId: string,
  characterPool: (Character & {imageUrl: string})[],
  currentCrew: Partial<Record<Role, DraftPick>>
) {
    const batch = writeBatch(db);
    const availableRoles = ROLES.filter(role => !currentCrew[role]);
    const availableCharacters = [...characterPool];
    
    availableRoles.forEach(role => {
        if (availableCharacters.length === 0) return;

        const charIndex = Math.floor(Math.random() * availableCharacters.length);
        const character = availableCharacters.splice(charIndex, 1)[0];

        const draftPickRef = doc(collection(db, `rooms/${roomId}/draftPicks`));
        const draftPickData = {
            playerId,
            role,
            characterName: character.name,
            characterDescription: character.description,
            characterImageUrl: character.imageUrl,
        };
        batch.set(draftPickRef, draftPickData);
    });

    // Since this fills the crew, end the drafting phase
    const roomRef = doc(db, 'rooms', roomId);
    batch.update(roomRef, { status: 'finished', currentPlayerId: null });

    await batch.commit().catch((err) => {
        const permissionError = new FirestorePermissionError({
            path: `rooms/${roomId}/draftPicks`,
            operation: 'create',
            requestResourceData: { action: "randomize" },
        });
        errorEmitter.emit('permission-error', permissionError);
        throw err;
    });
}

export async function submitVotes(
  roomId: string,
  votes: Omit<Vote, 'id'>[],
  playerCount: number,
  newVoterCount: number
) {
  const batch = writeBatch(db);
  const votesCollectionRef = collection(db, `rooms/${roomId}/votes`);

  votes.forEach((vote) => {
    const voteRef = doc(votesCollectionRef);
    batch.set(voteRef, vote);
  });
  
  const totalVotesExpected = playerCount > 1 ? playerCount : 1;

  if (newVoterCount >= totalVotesExpected) {
    const roomRef = doc(db, 'rooms', roomId);
    batch.update(roomRef, { status: 'finished' });
  }

  await batch.commit().catch((err) => {
    const permissionError = new FirestorePermissionError({
      path: `rooms/${roomId}/votes`,
      operation: 'create',
      requestResourceData: votes,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  });
}

export async function setPlayerCount(roomId: string, count: number) {
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, { playerCount: count }).catch((err) => {
    const permissionError = new FirestorePermissionError({
      path: roomRef.path,
      operation: 'update',
      requestResourceData: { playerCount: count },
    });
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  });
}

export async function updateRoomStatus(
  roomId: string,
  status: 'drafting' | 'voting' | 'finished'
) {
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, { status: status, currentPlayerId: null }).catch(
    (err) => {
      const permissionError = new FirestorePermissionError({
        path: roomRef.path,
        operation: 'update',
        requestResourceData: { status },
      });
      errorEmitter.emit('permission-error', permissionError);
      throw err;
    }
  );
}
