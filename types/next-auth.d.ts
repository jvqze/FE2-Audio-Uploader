import NextAuth, { DefaultUser, JWT, Profile } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            username?: string;
            name?: string;
            email?: string;
            image?: string;
        };
        accessToken?: string;
    }

    interface Profile {
        avatar?: string;
        username?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        email?: string;
        accessToken?: string;
    }
}

declare module 'formidable';
