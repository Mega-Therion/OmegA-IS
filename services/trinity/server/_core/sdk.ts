import type { UserAuthService } from "./services/UserAuthService";
import { UserAuthService as Service } from "./services/UserAuthService";

export type { SessionPayload } from "./services/UserAuthService";

export const sdk: UserAuthService = new Service();
