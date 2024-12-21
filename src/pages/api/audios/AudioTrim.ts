import cloudinary from '../../../utils/cloudinary';

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { publicId, startTime, endTime } = req.body;

    if (
        !publicId ||
        typeof startTime !== 'number' ||
        typeof endTime !== 'number' ||
        startTime >= endTime
    ) {
        return res
            .status(400)
            .json({ success: false, message: 'Invalid publicId or time offsets' });
    }

    try {
        const trimmedAudio = cloudinary.url(publicId, {
            resource_type: 'video',
            start_offset: startTime,
            end_offset: endTime,
            format: 'mp3',
        });
        res.status(200).json({ success: true, trimmedAudioUrl: trimmedAudio });
    } catch (error) {
        console.error('Error trimming audio:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error occurred',
        });
    }
}
