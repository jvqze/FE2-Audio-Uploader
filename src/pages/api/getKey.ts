import CryptoJS from 'crypto-js';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import authOptions from './auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const session = await getServerSession(req, res, authOptions);
        if (!session) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const nextAuthSecret = process.env.NEXT_PUBLIC_SECRET_KEY;
        if (!nextAuthSecret) {
            return res.status(500).json({ message: 'Server error: Missing NEXTAUTH_SECRET' });
        }

        const tixteApiKey = process.env.TIXTE_API_KEY;
        if (!tixteApiKey) {
            return res.status(500).json({ message: 'Server error: Missing Tixte API key' });
        }
        const encryptedApiKey = CryptoJS.AES.encrypt(tixteApiKey, nextAuthSecret).toString();
        res.status(200).json({ tixteApiKey: encryptedApiKey });
    } catch (error) {
        console.error('Error in pre-signed upload handler:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
