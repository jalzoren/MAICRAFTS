import supabase from "../supabaseClient.js";

/**
 * Middleware: authenticateUser
 * - Reads Bearer token
 * - Verifies with Supabase
 * - Attaches user to req.user
 */
export const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
  
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }
  
    const token = authHeader.split(" ")[1];
  
    const { data: { user }, error } = await supabase.auth.getUser(token);
  
    if (error || !user) {
      req.user = null;
      return next(); // still optional
    }
  
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || "CUSTOMER",
    };
  
    next();
  };

  export const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
  
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing token" });
    }
  
    const token = authHeader.split(" ")[1];
  
    const { data, error } = await supabase.auth.getUser(token);
  
    const user = data?.user;
  
    if (error || !user) {
      return res.status(401).json({ message: "Invalid token" });
    }
  
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || "CUSTOMER",
    };
  
    next();
  };