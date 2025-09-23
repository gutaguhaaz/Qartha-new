
// Tooltip handler to disable native browser tooltips and enable custom ones
export function initializeCustomTooltips() {
  // Function to disable native tooltips and enable custom ones
  const handleTooltips = () => {
    const elementsWithTitle = document.querySelectorAll('[title]');
    
    elementsWithTitle.forEach((element) => {
      const titleText = element.getAttribute('title');
      if (titleText) {
        // Store the original title in a data attribute
        element.setAttribute('data-original-title', titleText);
        
        // Remove the title attribute to prevent native tooltip
        element.removeAttribute('title');
        
        // Add event listeners for custom tooltip
        element.addEventListener('mouseenter', () => {
          element.setAttribute('title', titleText);
        });
        
        element.addEventListener('mouseleave', () => {
          element.removeAttribute('title');
        });
      }
    });
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleTooltips);
  } else {
    handleTooltips();
  }

  // Also run when new elements are added (for dynamic content)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.hasAttribute('title')) {
              const titleText = element.getAttribute('title');
              if (titleText) {
                element.setAttribute('data-original-title', titleText);
                element.removeAttribute('title');
                
                element.addEventListener('mouseenter', () => {
                  element.setAttribute('title', titleText);
                });
                
                element.addEventListener('mouseleave', () => {
                  element.removeAttribute('title');
                });
              }
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
