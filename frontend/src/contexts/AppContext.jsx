import { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext(null);

const appInitialState = {
  loading: false,
  notifications: [],
  globalError: null,
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_GLOBAL_ERROR':
      return { ...state, globalError: action.payload };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            id: Date.now(),
            ...action.payload,
          },
        ],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(
          (n) => n.id !== action.payload
        ),
      };
    case 'CLEAR_ALL_NOTIFICATIONS':
      return { ...state, notifications: [] };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, appInitialState);

  const setLoading = useCallback((loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setGlobalError = useCallback((error) => {
    dispatch({ type: 'SET_GLOBAL_ERROR', payload: error });
  }, []);

  const addNotification = useCallback(
    (message, type = 'info', duration = 3000) => {
      const id = Date.now();
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { message, type, duration },
      });

      if (duration > 0) {
        setTimeout(() => {
          dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
        }, duration);
      }
    },
    []
  );

  const removeNotification = useCallback((id) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const clearAllNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' });
  }, []);

  const success = useCallback(
    (message, duration) => {
      addNotification(message, 'success', duration);
    },
    [addNotification]
  );

  const error = useCallback(
    (message, duration) => {
      addNotification(message, 'error', duration);
    },
    [addNotification]
  );

  const warning = useCallback(
    (message, duration) => {
      addNotification(message, 'warning', duration);
    },
    [addNotification]
  );

  const info = useCallback(
    (message, duration) => {
      addNotification(message, 'info', duration);
    },
    [addNotification]
  );

  return (
    <AppContext.Provider
      value={{
        ...state,
        setLoading,
        setGlobalError,
        addNotification,
        removeNotification,
        clearAllNotifications,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
