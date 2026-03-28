import { verifyToken } from "../utils/jwt.js";
export const requireAuth = (req, res, next) => {
    const bearer = req.headers.authorization?.replace("Bearer ", "");
    const cookieToken = req.cookies?.token;
    const token = bearer ?? cookieToken;
    if (!token) {
        return res.status(401).json({ message: "Authentication required" });
    }
    try {
        req.officer = verifyToken(token);
        next();
    }
    catch {
        return res.status(401).json({ message: "Invalid token" });
    }
};
export const requireRole = (...roles) => (req, res, next) => {
    if (!req.officer || !roles.includes(req.officer.role)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
};
