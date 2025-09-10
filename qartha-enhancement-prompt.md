# Qartha System Enhancement Prompt (Adjusted for Current Implementation)

You are a senior full-stack engineer working on the existing "Qartha" multi-tenant IDF directory system. The project already has a solid foundation with FastAPI backend, PostgreSQL database, React frontend, and basic functionality. Perform targeted enhancements with THREE main goals:

## CURRENT STATE
✅ **Already Implemented:**
- Multi-tenant FastAPI backend with PostgreSQL
- React 18 frontend with TypeScript and Vite
- Multi-cluster/project routing (`/{cluster}/{project}/`)
- Health monitoring with color-coded semaphore system
- Asset management (images, documents, diagrams)
- CSV device import functionality
- QR code generation
- Basic admin interface with authentication
- Responsive design with Tailwind CSS

## GOAL 1 — ENGLISH-ONLY PROJECT
**Current Issue:** Mixed Spanish/English throughout the UI and code

**Tasks:**
- Audit ALL UI strings, labels, buttons, and messages for Spanish text
- Convert Spanish UI elements to clear, neutral English:
  - "Directorio de IDFs" → "IDF Directory" 
  - "Estado de salud" → "Health Status"
  - "Operativo/Revisión/Falla" → "Operational/Under Review/Critical Failure"
  - Form labels, placeholders, error messages, tooltips
- Update health status display logic to show English labels while preserving backend data
- Convert any Spanish comments, console logs, or variable names to English
- Update page titles, navigation labels, and breadcrumbs
- Keep API endpoints and data structure unchanged - only update display text

## GOAL 2 — DARK/LIGHT THEME SYSTEM
**Current Issue:** No theme switching capability

**Tasks:**
- Implement proper dark/light theme using TailwindCSS dark mode
- Configure `tailwind.config.ts` with `darkMode: "class"`
- Create ThemeProvider component with:
  - System preference detection on first load
  - localStorage persistence for user choice
  - Toggle functionality with immediate visual feedback
- Add theme toggle button to main navigation (sun/moon icons)
- Ensure all components support both themes:
  - Cards, tables, forms, modals, navigation
  - Proper contrast ratios for accessibility
  - Status indicators maintain visibility in both themes
  - Hover and focus states work in both themes
- Test all pages: Directory List, IDF Detail, Admin interface

## GOAL 3 — ENHANCED ADMIN INTERFACE
**Current Issue:** Basic admin functionality needs UX improvements

**Tasks:**
- Rename `/cms` route to `/admin` with "Admin" navigation label
- Enhance the admin dashboard with:
  - **IDF Management Table:** List all IDFs with Edit/Delete actions
  - **Bulk Operations:** Select multiple IDFs for batch actions
  - **Enhanced Add/Edit Forms:** Better validation and UX
  - **Confirmation Modals:** For all destructive actions with clear warnings
- Improve Asset Management:
  - **Drag-and-drop file uploads** with progress indicators
  - **Image gallery management:** Reorder, replace, delete with previews
  - **Document management:** Upload, organize, and manage PDF/doc files
  - **Diagram management:** Upload and replace technical diagrams
- **Device Management Enhancements:**
  - Better CSV upload UI with template download
  - Validation feedback and error handling
  - Preview imported data before saving
- Add loading states, error handling, and success notifications
- Implement proper ARIA labels for accessibility

## TECHNICAL REQUIREMENTS
- Maintain existing database schema and API structure
- Preserve multi-tenant routing architecture
- Keep authentication system unchanged
- Ensure mobile responsiveness across all changes
- Add proper TypeScript types for new components
- Use existing shadcn/ui components where possible

## ACCEPTANCE CRITERIA
1. **Language:** Zero Spanish text visible in UI; all user-facing content in clear English
2. **Theming:** Seamless dark/light toggle with system preference detection and persistence
3. **Admin UX:** Intuitive, professional admin interface with proper confirmations and feedback
4. **Accessibility:** ARIA labels, keyboard navigation, proper contrast ratios
5. **Mobile:** All enhancements work properly on mobile devices
6. **Performance:** No degradation in load times or responsiveness

## DELIVERABLES
- ✅ Fully English interface with improved copy
- ✅ Working dark/light theme system with toggle
- ✅ Professional admin interface with enhanced CRUD operations
- ✅ Improved file management with modern UI patterns
- ✅ Proper error handling and user feedback throughout
- ✅ Maintained functionality of existing features

## PRIORITY ORDER
1. **English Conversion** (Quick wins, immediate user impact)
2. **Theme System** (Visual polish, user preference)
3. **Admin Enhancements** (Workflow improvements, usability)

Focus on practical improvements that enhance daily usage while maintaining the robust foundation already in place.