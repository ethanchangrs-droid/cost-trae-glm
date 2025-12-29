import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

const UserContext = createContext(null);

const userInitialState = {
  selectedUser: null,
  userList: [],
  loading: false,
  error: null,
};

const userReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_USER_LIST':
      return { ...state, userList: action.payload, loading: false };
    case 'SELECT_USER':
      return { ...state, selectedUser: action.payload };
    case 'CLEAR_USER':
      return { ...state, selectedUser: null };
    default:
      return state;
  }
};

export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, userInitialState);

  useEffect(() => {
    const savedUser = localStorage.getItem('selectedUser');
    if (savedUser) {
      dispatch({ type: 'SELECT_USER', payload: JSON.parse(savedUser) });
    }
  }, []);

  const selectUser = useCallback((user) => {
    dispatch({ type: 'SELECT_USER', payload: user });
    localStorage.setItem('selectedUser', JSON.stringify(user));
  }, []);

  const clearUser = useCallback(() => {
    dispatch({ type: 'CLEAR_USER' });
    localStorage.removeItem('selectedUser');
  }, []);

  const setUserList = useCallback((users) => {
    dispatch({ type: 'SET_USER_LIST', payload: users });
  }, []);

  const setLoading = useCallback((loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  return (
    <UserContext.Provider
      value={{
        ...state,
        selectUser,
        clearUser,
        setUserList,
        setLoading,
        setError,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
