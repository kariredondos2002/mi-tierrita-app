import { useApiMutation, keys } from "@/hooks/shared";
import { usersService } from "@/services/users";
import { useSessionStore } from "@/stores/session";
import type { UpdateProfileInput } from "@/types/api";

/** Mi perfil: actualiza el nombre y lo refleja de inmediato en la sesión. */
export const useUpdateProfile = () =>
  useApiMutation(
    async (input: UpdateProfileInput) => {
      const user = await usersService.updateOwnProfile(input);
      useSessionStore.getState().setUser(user);
      return user;
    },
    { success: "Perfil actualizado.", notifyError: false, invalidate: [keys.users] },
  );
