import { genSalt, hash, compare } from 'bcrypt'

export const newPassword = async (password) => {
    const salt = await genSalt(8)
    const encrypted = await hash(password, salt)
    return encrypted
}

export const verifyPassword = async (password, hash) => {
    return await compare(password, hash)
}