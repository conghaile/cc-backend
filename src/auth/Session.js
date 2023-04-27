import { randomBytes } from 'crypto'

export const newSession = async (email, client) => {
    const token = randomBytes(32).toString('hex')
    await client.set(token, email, {
        EX: 604800,
    })
    return token
}

export default { newSession }