import { randomBytes } from 'crypto'

export const newSession = async () => {
    return await randomBytes(32).toString('hex')
}

export default { newSession }