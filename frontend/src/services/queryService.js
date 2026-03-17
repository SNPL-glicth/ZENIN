import api from './api';

export const queryService = {
  ask: (question) => api.post('/query', { question }),
};
