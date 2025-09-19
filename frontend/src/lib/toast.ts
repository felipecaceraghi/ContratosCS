/**
 * Simple toast notification system
 */

interface ToastOptions {
  title: string;
  description?: string;
  status: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export const toast = (options: ToastOptions) => {
  // Get existing toast container or create a new one
  let toastContainer = document.getElementById('toast-container');
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '1rem';
    toastContainer.style.right = '1rem';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  const duration = options.duration || 3000;
  
  // Set styles based on status
  toast.style.display = 'flex';
  toast.style.flexDirection = 'column';
  toast.style.padding = '1rem';
  toast.style.marginBottom = '0.5rem';
  toast.style.borderRadius = '0.375rem';
  toast.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  toast.style.minWidth = '20rem';
  toast.style.maxWidth = '24rem';
  toast.style.overflow = 'hidden';
  toast.style.transform = 'translateY(-100%)';
  toast.style.opacity = '0';
  toast.style.transition = 'all 0.3s ease-in-out';
  
  // Status-specific styles
  if (options.status === 'success') {
    toast.style.backgroundColor = '#10B981';
    toast.style.color = '#FFFFFF';
  } else if (options.status === 'error') {
    toast.style.backgroundColor = '#EF4444';
    toast.style.color = '#FFFFFF';
  } else if (options.status === 'warning') {
    toast.style.backgroundColor = '#F59E0B';
    toast.style.color = '#FFFFFF';
  } else {
    toast.style.backgroundColor = '#3B82F6';
    toast.style.color = '#FFFFFF';
  }
  
  // Add content
  const title = document.createElement('div');
  title.style.fontWeight = 'bold';
  title.style.marginBottom = options.description ? '0.25rem' : '0';
  title.textContent = options.title;
  toast.appendChild(title);
  
  if (options.description) {
    const description = document.createElement('div');
    description.style.fontSize = '0.875rem';
    description.textContent = options.description;
    toast.appendChild(description);
  }
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  }, 10);
  
  // Remove after duration
  setTimeout(() => {
    toast.style.transform = 'translateY(-100%)';
    toast.style.opacity = '0';
    
    setTimeout(() => {
      toastContainer?.removeChild(toast);
    }, 300);
  }, duration);
};