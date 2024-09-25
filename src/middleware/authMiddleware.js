require('dotenv').config();

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const bearerToken = req.headers['authorization'];
    // console.log('brearerToken:', bearerToken);
    if (!bearerToken) {
        return res.status(401).json({ error: 'Authorization token missing' });
    }
    const token = bearerToken.split(' ')[1];
    // console.log('Token:', token);
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {expiresIn: '24h'});   //change this to 1h
        // console.log('Decoded:', decoded);
        req.user = decoded;
        // console.log('User:', req.user);
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(403).json({ error: 'Please Login Again' });
    }
}

module.exports = verifyToken;