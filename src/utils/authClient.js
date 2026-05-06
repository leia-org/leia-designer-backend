import axios from 'axios';


export const getUserProfileFromAuthService = async (userId) => {
  if (!userId) return null;

  try {
    const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/v1/users/${userId}`, {
      headers: {
        'x-services-intern-token': process.env.INTERN_TOKEN
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching user ${userId} from Auth Service:`, error.message);
    return null;
  }
};

