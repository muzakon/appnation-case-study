import type { FirebaseDecodedToken } from "../../common/interfaces";

export abstract class ChatService {
  static listUserChats(decodedToken: FirebaseDecodedToken): void {
    console.log(decodedToken);
  }

  static getUserChatHistory(decodedToken: FirebaseDecodedToken): void {
    console.log(decodedToken);
  }

  static getUserChatCompletion(decodedToken: FirebaseDecodedToken): void {
    console.log(decodedToken);
  }
}
