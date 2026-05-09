import { useMutation } from "@tanstack/react-query";
import { resendConfirmation } from "@/services/api";

type UseResendConfirmationOptions = {
  onMutate?: () => void | Promise<void>;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  onSettled?: () => void;
};

export const useResendConfirmation = (options: UseResendConfirmationOptions = {}) => {
  return useMutation({
    mutationFn: (email: string) => resendConfirmation(email),
    onMutate: async () => {
      if (options.onMutate) {
        await options.onMutate();
      }
    },
    onSuccess: () => {
      options.onSuccess?.();
    },
    onError: (error) => {
      options.onError?.(error);
    },
    onSettled: () => {
      options.onSettled?.();
    },
  });
};
