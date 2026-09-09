export class AuthResponseDto {
  token: string;
  userId: number;
  username: string;
  email: string;
  avatar: string | null;

  constructor(token: string, userId: number, username: string, email: string, avatar: string | null) {
    this.token = token;
    this.userId = userId;
    this.username = username;
    this.email = email;
    this.avatar = avatar;
  }
}
