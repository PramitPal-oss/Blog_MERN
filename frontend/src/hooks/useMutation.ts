import { useState, useCallback, useRef, useEffect } from "react";
import { apiMessage } from "../api/client";

export function useMutation<TArgs extends any[], TResult>(
  mutationFn: (...args: TArgs) => Promise<TResult>
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  const mutate = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (isSubmittingRef.current) return undefined;
      
      setIsSubmitting(true);
      isSubmittingRef.current = true;
      setError(null);
      
      try {
        return await mutationFn(...args);
      } catch (err) {
        setError(apiMessage(err));
        throw err;
      } finally {
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }
    },
    [mutationFn]
  );

  return { mutate, isSubmitting, error, setError, clearError: () => setError(null) };
}
