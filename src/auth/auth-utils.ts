import { ValidationError } from "../common/errors";
import { AuthProvider } from "../common/interfaces";

export class AuthUtils {
  static extractTokenFromHeader(authorization: string | undefined): string | undefined {
    if (!authorization) return undefined;

    const [type, token] = authorization.split(" ");
    return type === "Bearer" ? token : undefined;
  }

  static mapFirebaseProvider(firebaseProvider: string): AuthProvider {
    switch (firebaseProvider) {
      case "google.com":
        return AuthProvider.GOOGLE;

      case "github.com":
        return AuthProvider.GITHUB;

      case "microsoft.com":
      case "live.com":
      case "hotmail.com":
        return AuthProvider.MICROSOFT;

      default:
        throw new ValidationError(`Unsupported provider: ${firebaseProvider}`);
    }
  }
}
