
'use client';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import {
  FirestorePermissionError,
  isFirestorePermissionError,
} from '@/firebase/errors';

export default function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error('Firestore Permission Error:', error.toObject());
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description:
          'You do not have permission to perform this action. Check the console for details.',
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);

    // Add a generic error handler for uncaught promise rejections
    const handleUncaughtErrors = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      if (isFirestorePermissionError(error)) {
        // This is already handled by the specific listener, so we can ignore it.
        return;
      }

      if (error?.name === 'FirebaseError') {
        console.error('Unhandled Firebase Error:', error);
        toast({
          variant: 'destructive',
          title: error.code || 'Firebase Error',
          description: error.message || 'An unknown Firebase error occurred.',
        });
      }
    };

    window.addEventListener('unhandledrejection', handleUncaughtErrors);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
      window.removeEventListener('unhandledrejection', handleUncaughtErrors);
    };
  }, [toast]);

  return null;
}
