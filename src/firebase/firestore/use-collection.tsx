
'use client';
import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  Query,
  DocumentData,
  query,
  where,
  collectionGroup,
  CollectionReference,
  getDocs,
} from 'firebase/firestore';
import { useFirestore } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

type CollectionOptions = {
  query?: [string, '==', any];
  isCollectionGroup?: boolean;
};

export function useCollection<T>(
  collectionPath: string | null | undefined,
  options?: CollectionOptions
) {
  const firestore = useFirestore();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firestore || !collectionPath) {
      setIsLoading(false);
      setData([]); // Ensure data is cleared when path is invalid
      return;
    }

    let collectionRef: Query | CollectionReference = collection(
      firestore,
      collectionPath
    );
    if (options?.isCollectionGroup) {
      collectionRef = collectionGroup(firestore, collectionPath);
    }

    let q: Query;
    if (options?.query) {
      q = query(collectionRef, where(...options.query));
    } else {
      q = query(collectionRef);
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as T)
        );
        setData(docs);
        setIsLoading(false);
      },
      (err) => {
        console.error(err);
        const permissionError = new FirestorePermissionError({
          path: collectionPath,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, collectionPath, options?.query, options?.isCollectionGroup]);

  return { data, isLoading, error };
}
