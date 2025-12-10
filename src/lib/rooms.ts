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
import type { Character, Role } from './characters';
import { getCharImage } from './character-images';

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
}

export interface DraftPick {
    id: string;
    playerId: string;
    role: string;
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
export async function createRoom(hostId: string, displayName?: string): Promise<string> {
  const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
  const roomRef = doc(db, 'rooms', roomId);
  const roomData: Room = {
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
  };

  try {
    const batch = writeBatch(db);
    batch.set(roomRef, roomData);
    batch.set(playerRef, playerData);
    await batch.commit()
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
    return faker.person.firstName() + " " + faker.animal.type();
}


/**
 * Adds a player to a room in Firestore.
 * @param roomId The ID of the room to join.
 * @param user The user object of the player joining.
 * @param displayName The optional display name for the player.
 */
export async function addPlayerToRoom(roomId: string, user: User, displayName?: string) {
  if (!user) return;
  const playerRef = doc(db, `rooms/${roomId}/players`, user.uid);
  const playerData: Player = {
    id: user.uid,
    displayName: displayName || user.displayName || generateFunnyName(),
  };

  await setDoc(playerRef, playerData, { merge: true }).catch((err) => {
    const permissionError = new FirestorePermissionError({
      path: playerRef.path,
      operation: 'write',
      requestResourceData: playerData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  });
}

/**
 * Lets a user join a room, which involves adding them as a player.
 * @param roomId The ID of the room to join.
 * @param user The user object.
 * @param displayName The optional display name for the player.
 */
export async function joinRoom(roomId: string, user: User, displayName?: string) {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error('Room not found');
  }

  const playersSnap = await getDocs(collection(db, `rooms/${roomId}/players`));
  const roomData = roomSnap.data() as Room;

  if (playersSnap.size >= roomData.playerCount) {
    // Allow re-joining if already in the player list
    const playerIds = playersSnap.docs.map(d => d.id);
    if (!playerIds.includes(user.uid)) {
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
  const turnOrder = players.map(p => p.id).sort(() => Math.random() - 0.5);

  await updateDoc(roomRef, { 
    status: 'drafting',
    turnOrder: turnOrder,
    currentPlayerId: turnOrder[0] // Start with the first player
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
    const draftPickRef = doc(collection(db, `rooms/${roomId}/draftPicks`));
    
    const draftPickData = {
        playerId,
        role,
        characterName,
        characterDescription,
        characterImageUrl
    };

    const batch = writeBatch(db);
    batch.set(draftPickRef, draftPickData);

    const roomRef = doc(db, 'rooms', roomId);
    
    const draftPicksCollection = collection(db, `rooms/${roomId}/draftPicks`);
    const draftPicksSnapshot = await getDocs(draftPicksCollection);
    const totalPicks = (draftPicksSnapshot.size || 0) + 1; // +1 for the current pick
    const totalSlots = playerCount * 8; // 8 roles per player

    if (totalPicks >= totalSlots) {
       batch.update(roomRef, { status: 'finished', currentPlayerId: null });
    } else {
        const currentIndex = turnOrder.indexOf(playerId);
        const nextPlayerIndex = (currentIndex + 1) % turnOrder.length;
        const nextPlayerId = turnOrder[nextPlayerIndex];
        batch.update(roomRef, { currentPlayerId: nextPlayerId });
    }


    await batch.commit().catch((err) => {
        const permissionError = new FirestorePermissionError({
            path: `rooms/${roomId}/draftPicks`,
            operation: 'create',
            requestResourceData: draftPickData
        });
        errorEmitter.emit('permission-error', permissionError);
        throw err;
    });
}

export async function swapCharacterRoles(roomId: string, playerId: string, roleA: Role, roleB: Role) {
    const draftPicksRef = collection(db, `rooms/${roomId}/draftPicks`);

    const qA = query(draftPicksRef, where("playerId", "==", playerId), where("role", "==", roleA), limit(1));
    const qB = query(draftPicksRef, where("playerId", "==", playerId), where("role", "==", roleB), limit(1));

    try {
        const [snapshotA, snapshotB] = await Promise.all([getDocs(qA), getDocs(qB)]);
        
        const docA = snapshotA.docs[0];
        const docB = snapshotB.docs[0];

        // This can happen if one of the slots is empty. We only swap if both roles have a character.
        if (!docA || !docB) {
            console.log("Both roles must have a character to swap.");
            return;
        }

        const batch = writeBatch(db);
        
        // Optimistically update roles.
        batch.update(docA.ref, { role: roleB });
        batch.update(docB.ref, { role: roleA });

        await batch.commit();

    } catch (err) {
        const permissionError = new FirestorePermissionError({
            path: `rooms/${roomId}/draftPicks`,
            operation: 'update',
            requestResourceData: { message: `Swap failed between ${roleA} and ${roleB}` }
        });
        errorEmitter.emit('permission-error', permissionError);
        throw err;
    }
}


export async function randomizeCrew(
    roomId: string,
    playerId: string,
    emptyRoles: Role[],
    characterPool: Character[],
    setCharacterPool: (pool: Character[]) => void
) {
    const batch = writeBatch(db);
    const draftPicksRef = collection(db, `rooms/${roomId}/draftPicks`);
    const newPool = [...characterPool];
    let charactersToDraft = emptyRoles.length;

    const charactersForDraft = [];
    while (charactersToDraft > 0 && newPool.length > 0) {
        const draftIndex = Math.floor(Math.random() * newPool.length);
        const character = newPool.splice(draftIndex, 1)[0];
        charactersForDraft.push(character);
        charactersToDraft--;
    }

    if (charactersForDraft.length < emptyRoles.length) {
        // Handle case where pool runs out
        console.error("Not enough characters in the pool to randomize crew.");
        return;
    }

    try {
        for (let i = 0; i < emptyRoles.length; i++) {
            const role = emptyRoles[i];
            const character = charactersForDraft[i];
            const imageUrl = await getCharImage(character.name);
            
            const newDraftPickRef = doc(draftPicksRef);
            const draftPickData = {
                playerId,
                role,
                characterName: character.name,
                characterDescription: character.description,
                characterImageUrl: imageUrl,
            };
            batch.set(newDraftPickRef, draftPickData);
        }

        // After filling roles, set game to finished
        const roomRef = doc(db, 'rooms', roomId);
        batch.update(roomRef, { status: 'finished', currentPlayerId: null });

        await batch.commit();
        setCharacterPool(newPool); // Update the character pool state in the UI

    } catch (err) {
        const permissionError = new FirestorePermissionError({
            path: `rooms/${roomId}/draftPicks`,
            operation: 'create',
            requestResourceData: { message: "Randomize crew failed" }
        });
        errorEmitter.emit('permission-error', permissionError);
        throw err;
    }
}


export async function submitVotes(roomId: string, votes: Omit<Vote, 'id'>[], playerCount: number, existingVotes: Vote[]) {
    const batch = writeBatch(db);
    const votesCollectionRef = collection(db, `rooms/${roomId}/votes`);
    
    votes.forEach(vote => {
        const voteRef = doc(votesCollectionRef);
        batch.set(voteRef, vote);
    });

    const roomRef = doc(db, 'rooms', roomId);
    
    const roomVotes = existingVotes.filter(v => v.id.startsWith(roomId));

    // Multiplayer mode: Check if all players have voted
    const totalVotesExpected = playerCount * (playerCount - 1);
    const currentVotes = (roomVotes.length || 0) + votes.length;
    
    if (currentVotes >= totalVotesExpected) {
        batch.update(roomRef, { status: 'finished' });
    }

    await batch.commit().catch((err) => {
        const permissionError = new FirestorePermissionError({
            path: `rooms/${roomId}/votes`,
            operation: 'create',
            requestResourceData: votes
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
