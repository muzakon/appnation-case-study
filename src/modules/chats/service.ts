import { NotFoundError } from "../../common/errors";
import type { DecodedToken } from "../../common/interfaces";
import type { Chat, Message } from "../../database/prisma/client";
import { MessageRepository } from "../messages/repository";
import { UserRepository } from "../users/repository";
import { ChatRepository } from "./repository";

export abstract class ChatService {
  private static async requireUserId(decodedToken: DecodedToken): Promise<string> {
    const user = await UserRepository.findUser(decodedToken.id);
    if (!user) {
      throw new NotFoundError("User", decodedToken.id);
    }
    return user.id;
  }

  private static async requireUserChat(userId: string, chatId: string): Promise<void> {
    const chat = await ChatRepository.findByChatAndUserId(userId, chatId);
    if (!chat) {
      throw new NotFoundError("Chat", chatId);
    }
  }

  static async listUserChats(decodedToken: DecodedToken): Promise<Chat[]> {
    const userId = await ChatService.requireUserId(decodedToken);
    return ChatRepository.listUserChats(userId);
  }

  static async getChatHistory(decodedToken: DecodedToken, chatId: string): Promise<Message[]> {
    const userId = await ChatService.requireUserId(decodedToken);
    await ChatService.requireUserChat(userId, chatId);
    return MessageRepository.findMessages(chatId);
  }

  static async getUserChatCompletion(decodedToken: DecodedToken, chatId: string): Promise<void> {
    const userId = await ChatService.requireUserId(decodedToken);
    await ChatService.requireUserChat(userId, chatId);
  }
}
