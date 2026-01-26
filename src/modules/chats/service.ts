import type { FirebaseDecodedToken } from "../../common/interfaces";

export abstract class ChatService {
  static listUserChats(decodedToken: FirebaseDecodedToken): Promise<any> {
    return Promise.resolve({});
  }

  static getUserChatHistory(decodedToken: FirebaseDecodedToken): Promise<any> {
    return Promise.resolve({});
  }

  static getUserChatCompletion(decodedToken: FirebaseDecodedToken): Promise<any> {
    return Promise.resolve({});
  }
}
