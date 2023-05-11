import { randomBytes } from 'crypto'

export const newSession = async (email, client, time) => {
    const token = randomBytes(32).toString('hex')
    await client.set(token, email, {
        EX: time,
    })
    return token
}