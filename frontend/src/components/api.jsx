import axios from "axios";

const api = axios.create({
  baseURL: "/",  // <-- relative URL will use same host and port
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export default api;
