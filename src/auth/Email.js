export const sendVerification = async (email, client, token) => {
    let msg = {
        to: email,
        from: 'noreply@coincrowd.biz',
        subject: 'Verify your new CoinCrowd account',
        text: `Thanks for signing up with CoinCrowd! Please click the link below to verify your new account:\nhttps://coincrowd.biz/verification?token=${token}\nIf you didn't create an account with us, please ignore this email.`,
        html: `<h1>Welcome to CoinCrowd!</h1><p>Thanks for signing up! To get started with your new account, <a href="https://coincrowd.biz/verification?token=${token}">click here</a> The link will expire in 24 hours.</p><p>If you didn't create an account with us, please ignore this email.</p>`,
    }
    try {
        await client.send(msg)
        return null
    } catch (e) {
        return e
    }
}