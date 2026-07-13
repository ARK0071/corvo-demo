import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      role: string;
      portId: string;
      title: string;
      active: boolean;
      subrecipientId?: string | null;
    };
  }
}
