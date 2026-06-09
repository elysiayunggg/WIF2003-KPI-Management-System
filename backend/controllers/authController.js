const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

function buildUserPayload(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
    department: user.department,
    avatar: user.avatar,
    preferences: user.preferences,
    lastLogin: user.lastLogin
  };
}

function signAuthToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

function getFrontendPagesUrl() {
  return (process.env.FRONTEND_URL || "http://127.0.0.1:5500/frontend/pages").replace(/\/$/, "");
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, employeeId, department, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const normalizedRole = role ? role.toLowerCase() : "staff";
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: normalizedRole,
      employeeId,
      department,
      avatar
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        department: user.department,
        avatar: user.avatar,
        preferences: user.preferences,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signAuthToken(user);

    res.json({
      message: "Login successful",
      token,
      user: buildUserPayload(user)
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.googleLogin = (req, res) => {
  const requestedRole = String(req.query.role || "staff").toLowerCase();
  const role = ["manager", "staff"].includes(requestedRole) ? requestedRole : "staff";

  const authorizationUrl = googleClient.generateAuthUrl({
    access_type: "offline",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state: role
  });

  res.redirect(authorizationUrl);
};

exports.googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect(`${getFrontendPagesUrl()}/login.html?oauthError=missing_code`);
    }

    const { tokens } = await googleClient.getToken(code);
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.redirect(`${getFrontendPagesUrl()}/login.html?oauthError=email_missing`);
    }

    const normalizedRole = ["manager", "staff"].includes(String(state || "").toLowerCase())
      ? String(state).toLowerCase()
      : "staff";

    let user = await User.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      const generatedPassword = await bcrypt.hash(
        `google:${payload.sub}:${process.env.JWT_SECRET}`,
        10
      );

      user = await User.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        password: generatedPassword,
        role: normalizedRole,
        googleId: payload.sub,
        avatar: payload.picture || ""
      });
    } else {
      user.googleId = user.googleId || payload.sub;
      user.avatar = user.avatar || payload.picture || "";
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signAuthToken(user);
    const userParam = encodeURIComponent(JSON.stringify(buildUserPayload(user)));
    const redirectUrl = `${getFrontendPagesUrl()}/login.html?oauthToken=${encodeURIComponent(token)}&oauthUser=${userParam}`;

    return res.redirect(redirectUrl);
  } catch (error) {
    return res.redirect(`${getFrontendPagesUrl()}/login.html?oauthError=google_login_failed`);
  }
};

exports.forgotPassword = async (req, res) => {
  res.json({
    message: "If this email exists, password reset instructions will be sent."
  });
};

exports.getCurrentUser = async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      employeeId: req.user.employeeId,
      department: req.user.department,
      avatar: req.user.avatar,
      preferences: req.user.preferences,
      lastLogin: req.user.lastLogin
    }
  });
};

exports.logout = async (req, res) => {
  res.json({ message: "Logout successful" });
};

exports.getUsers = async (req, res) => {
  try {
    const filter = {};

    if (req.query.role) {
      filter.role = req.query.role.toLowerCase();
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ name: 1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
