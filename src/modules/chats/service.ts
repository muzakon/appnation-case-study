import { NotFoundError } from "../../common/errors";
import type { DecodedToken } from "../../common/interfaces";
import type { Chat, Message } from "../../database/prisma/client";
import type { MessageRepository } from "../messages/repository";
import type { UserRepository } from "../users/repository";
import type { ChatRepository } from "./repository";

export class ChatService {
  private readonly userRepository: UserRepository;
  private readonly messageRepository: MessageRepository;
  private readonly chatRepository: ChatRepository;

  constructor(
    userRepository: UserRepository,
    chatRepository: ChatRepository,
    messageRepository: MessageRepository,
  ) {
    this.userRepository = userRepository;
    this.chatRepository = chatRepository;
    this.messageRepository = messageRepository;
  }

  private async requireUserId(decodedToken: DecodedToken): Promise<string> {
    const user = await this.userRepository.findUser(decodedToken.id);
    if (!user) {
      throw new NotFoundError("User", decodedToken.id);
    }
    return user.id;
  }

  private async requireUserChat(userId: string, chatId: string): Promise<void> {
    const chat = await this.chatRepository.findByChatAndUserId(userId, chatId);
    if (!chat) {
      throw new NotFoundError("Chat", chatId);
    }
  }

  async listUserChats(decodedToken: DecodedToken): Promise<Chat[]> {
    const userId = await this.requireUserId(decodedToken);
    return this.chatRepository.listUserChats(userId);
  }

  async getChatHistory(decodedToken: DecodedToken, chatId: string): Promise<Message[]> {
    const userId = await this.requireUserId(decodedToken);
    await this.requireUserChat(userId, chatId);
    return this.messageRepository.findMessages(chatId);
  }

  async getUserChatCompletion(decodedToken: DecodedToken, chatId: string): Promise<void> {
    const userId = await this.requireUserId(decodedToken);
    await this.requireUserChat(userId, chatId);
  }
}
