export interface Message {
  text: string;
  sender: 'user' | 'bot';
  isIntermediate?: boolean;
  isLoading?: boolean;
}
