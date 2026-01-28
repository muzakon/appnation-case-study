export enum AuthProvider {
  GOOGLE = "GOOGLE",
  GITHUB = "GITHUB",
  MICROSOFT = "MICROSOFT",
  PASSWORD = "PASSWORD",
}

export interface DecodedToken {
  id: string;
  name?: string;
  picture?: string;
  sub: string;
  email: string;
  email_verified?: boolean;
  firebase: {
    identities: {
      [provider: string]: string[];
    };
    sign_in_provider: string;
  };
  mappedProvider: string;
}
