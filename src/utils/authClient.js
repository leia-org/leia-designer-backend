import axios from 'axios';


export const getUserProfileFromAuthService = async (userId) => {
  if (!userId) return null;

  try {
    const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/v1/users/intern/${userId}`, {
      headers: {
        'x-intern-token': process.env.INTERN_TOKEN
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching user ${userId} from Auth Service:`, error.message);
    return null;
  }
};

export const populateUserInEntity = async (entity) => {
  if (!entity) return null;
  
  if (Array.isArray(entity)) {
    return await Promise.all(entity.map(e => populateUserInEntity(e)));
  }

  const entityObj = entity.toJSON ? entity.toJSON() : entity;
  delete entityObj.userId;
  
  if (entityObj.user) {
    const userProfile = await getUserProfileFromAuthService(entityObj.user);
    if (userProfile) {
      entityObj.user = userProfile;
    }
  }
  
  return entityObj;
};