import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import authOptions from './auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const session = await getServerSession(req, res, authOptions);
        if (!session) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const tixteApiKey = process.env.TIXTE_API_KEY;

        if (!tixteApiKey) {
            return res.status(500).json({ message: 'Server error: Missing Tixte API key' });
        }
        const encodedApiKey = Buffer.from(tixteApiKey).toString('base64');
        res.status(200).json({ tixteApiKey: encodedApiKey });
    } catch (error) {
        console.error('Error in pre-signed upload handler:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
