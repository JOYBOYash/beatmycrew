
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
  runTransaction,
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
}

export interface Player {
  id: string; // This will be the user's UID
  displayName: string;
  isDraftingDone?: boolean;
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

  const roomData = {
    id: roomId,
    hostId,
    status: 'lobby',
    createdAt: serverTimestamp(),
    playerCount: 1, // Default to 1 player
  };

  const playerRef = doc(db, `rooms/${roomId}/players`, hostId);
  const playerData: Player = {
    id: hostId,
    displayName: displayName || generateFunnyName(),
    isDraftingDone: false,
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
  const playerRef = doc(db, `rooms/${roomId}/players`, user.uid);
  
  await runTransaction(db, async (transaction) => {
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists()) {
      throw new Error('Room not found');
    }
    
    const roomData = roomSnap.data() as Room;
    const playersCollectionRef = collection(db, `rooms/${roomId}/players`);
    const playersSnapshot = await getDocs(query(playersCollectionRef));
    const playerCount = playersSnapshot.size;

    const playerSnap = await transaction.get(playerRef);

    if (playerCount >= roomData.playerCount && !playerSnap.exists()) {
      throw new Error('Room is full');
    }

    if (!playerSnap.exists()) {
       const newPlayerData: Player = {
          id: user.uid,
          displayName: displayName || user.displayName || generateFunnyName(),
          isDraftingDone: false,
        };
        transaction.set(playerRef, newPlayerData);
    }
  }).catch(err => {
    if (err.message === 'Room not found' || err.message === 'Room is full') {
        throw err;
    }
    const permissionError = new FirestorePermissionError({
        path: playerRef.path,
        operation: 'create',
    });
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  });
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

  // Check if a character already exists in that role for the player
  const picksQuery = query(
    collection(db, `rooms/${roomId}/draftPicks`),
    where('playerId', '==', playerId),
    where('role', '==', role),
    limit(1)
  );

  const existingPickSnapshot = await getDocs(picksQuery);

  if (!existingPickSnapshot.empty) {
    // There's already a character in this role, this is an error or a swap.
    // For now, we'll just prevent adding another.
    console.error(`Player ${playerId} already has a character in role ${role}.`);
    return; // Or throw an error
  }


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
  
  // We determine if the draft is over by counting picks, not by turn cycles.
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
  playerId: string,
) {
    await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, 'rooms', roomId);
        const playersCollectionRef = collection(db, `rooms/${roomId}/players`);
        
        // --- READS FIRST ---
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) throw new Error("Room does not exist");
        const room = roomSnap.data() as Room;
        
        const playersSnapshot = await getDocs(query(playersCollectionRef));
        const allPlayers = playersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Player));

        // --- LOGIC ---
        // Check if everyone else (excluding the current player) is already done
        const otherPlayersDone = allPlayers
            .filter(p => p.id !== playerId)
            .every(p => p.isDraftingDone);
        
        const allPlayersCount = allPlayers.length;

        // If everyone else is ready, this player's click will finish the phase
        if (otherPlayersDone && allPlayersCount === room.playerCount) {
            const newStatus = room.playerCount === 1 ? 'finished' : 'voting';
            // --- WRITES LAST ---
            transaction.update(roomRef, { status: newStatus });
        }
        
        const playerRef = doc(db, `rooms/${roomId}/players`, playerId);
        transaction.update(playerRef, { isDraftingDone: true });

    }).catch((err) => {
      console.error("Finish drafting transaction failed: ", err);
       const permissionError = new FirestorePermissionError({
            path: `rooms/${roomId}/players/${playerId}`,
            operation: 'update',
            requestResourceData: { isDraftingDone: true },
        });
        errorEmitter.emit('permission-error', permissionError);
        throw err;
  });
}


export async function swapCharacterRoles(
  roomId: string,
  pick1Id: string,
  pick1Role: Role | null,
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

    // Since this fills the crew, end the drafting phase for this player
    const playerRef = doc(db, `rooms/${roomId}/players`, playerId);
    batch.update(playerRef, { isDraftingDone: true });


    await batch.commit().catch((err) => {
        const permissionError = new FirestorePermissionError({
            path: `rooms/${roomId}/draftPicks`,
            operation: 'create',
            requestResourceData: { action: "randomize" },
        });
        errorEmitter.emit('permission-error', permissionError);
        throw err;
    });

    // Now check if everyone is done
    await finishDrafting(roomId, playerId);
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
  
  const batch = writeBatch(db);
  batch.update(roomRef, { playerCount: count });

  // When changing player count, reset any "done" status
  const playersSnapshot = await getDocs(collection(db, `rooms/${roomId}/players`));
  playersSnapshot.forEach(playerDoc => {
      batch.update(playerDoc.ref, { isDraftingDone: false });
  });
  
  await batch.commit().catch((err) => {
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
