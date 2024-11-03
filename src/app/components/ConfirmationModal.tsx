interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: ConfirmationModalProps) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } transition-opacity duration-300`}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black ${
          isOpen ? 'opacity-50' : 'opacity-0'
        } transition-opacity duration-300`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl transform ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-4'
        } transition-all duration-300 ease-out`}
      >
        {/* Title */}
        <h3 className="text-lg font-semibold mb-2 text-gray-900">{title}</h3>
        
        {/* Message */}
        <p className="text-gray-600 mb-6">{message}</p>
        
        {/* Buttons */}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-all duration-200 
              hover:shadow-sm active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-md transition-all duration-200 
              hover:shadow-md active:scale-95"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}; 