import { useQuery } from "@tanstack/react-query";
import { keys } from "@/hooks/shared";
import { usersService } from "@/services/users";

/** v4.2: mis últimas acciones y conteos de 30 días (Mi perfil). */
export const useMyActivity = () => useQuery({ queryKey: [...keys.users, "me", "activity"], queryFn: usersService.myActivity });
