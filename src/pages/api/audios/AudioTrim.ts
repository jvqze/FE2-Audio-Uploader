import type { NextApiResponse } from 'next';

export default async function handler(res: NextApiResponse) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
}
