import { http } from "@/lib/http";
import type { MyActivity, ChangePasswordInput, CreateUserInput, Page, PageQuery, UpdateProfileInput, User } from "@/types/api";

export const usersService = {
  list: async (query: PageQuery): Promise<Page<User>> => (await http.get<Page<User>>("/users", { params: query })).data,
  get: async (id: number): Promise<User> => (await http.get<User>(`/users/${id}`)).data,
  create: async (input: CreateUserInput): Promise<User> => (await http.post<User>("/users", input)).data,
  updateOwnProfile: async (input: UpdateProfileInput): Promise<User> => (await http.put<User>("/users/me", input)).data,
  myActivity: async (): Promise<MyActivity> => (await http.get<MyActivity>("/users/me/activity")).data,
  changeOwnPassword: async (input: ChangePasswordInput): Promise<void> => {
    await http.put("/users/me/password", input);
  },
};
