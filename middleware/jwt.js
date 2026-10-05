import { expressjwt as jwt } from 'express-jwt';

function authJwt() {
    const secret = process.env.SECRET;
    const api = process.env.API_PREFIX;
    return jwt({
        secret,
        algorithms: ['HS256'],
        isRevoked: isRevoked
    }).unless({
        path: [
            { url: `${api}/users/login`, methods: ['POST'] },
            { url: `${api}/users/register`, methods: ['POST'] },
        ]
    })
}

async function isRevoked(req, token){
    //console.log(token)
    //console.log(req.auth)
    return token?.payload?.isAdmin !== true;
}

export default authJwt;