import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from './api';

export default function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user || !user.id) return;
    try {
      setLoading(true);
      const data = await apiRequest(`/notifications/user/${user.id}`);
      setNotifications(Array.isArray(data) ? data : []);
      const countRes = await apiRequest(`/notifications/user/${user.id}/unread-count`);
      setUnreadCount(countRes.unreadCount || 0);
    } catch (err) {
      if (!err.message?.includes("401")) {
        console.error("Failed to fetch notifications:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    if (user && user.id) {
      apiRequest(`/notifications/user/${user.id}`)
        .then((data) => {
          if (isMounted) setNotifications(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          if (!err.message?.includes("401")) {
            console.error("Failed to fetch notifications:", err);
          }
        });

      apiRequest(`/notifications/user/${user.id}/unread-count`)
        .then((countRes) => {
          if (isMounted) setUnreadCount(countRes.unreadCount || 0);
        })
        .catch(() => {});

      const interval = setInterval(() => {
        fetchNotifications();
      }, 15000);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [user, fetchNotifications]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await apiRequest(`/notifications/${id}/read?userId=${user.id}`, { method: 'PUT' });
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest(`/notifications/user/${user.id}/read-all`, { method: 'PUT' });
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '1.4rem',
          cursor: 'pointer',
          position: 'relative',
          padding: '6px 10px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'inherit'
        }}
        title="Notifications"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: '#e53e3e',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 6px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            minWidth: '18px',
            textAlign: 'center',
            lineHeight: 1
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '110%',
          width: '320px',
          maxHeight: '400px',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          color: '#1a202c',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          zIndex: 1000,
          padding: '12px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #edf2f7',
            paddingBottom: '8px',
            marginBottom: '8px'
          }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3182ce',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {loading && notifications.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.85rem', color: '#718096' }}>
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.85rem', color: '#718096' }}>
              No notifications yet.
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  marginBottom: '6px',
                  backgroundColor: n.read ? '#f7fafc' : '#ebf8ff',
                  borderLeft: n.read ? '3px solid #cbd5e0' : '3px solid #3182ce',
                  fontSize: '0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ flex: 1, marginRight: '8px' }}>
                  <div style={{ fontWeight: n.read ? 'normal' : '600', color: '#2d3748' }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#718096', marginTop: '4px' }}>
                    📅 {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                </div>
                {!n.read && (
                  <button
                    onClick={(e) => handleMarkAsRead(n.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#e53e3e',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      padding: '2px 4px'
                    }}
                    title="Mark as read"
                  >
                    ✓
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
