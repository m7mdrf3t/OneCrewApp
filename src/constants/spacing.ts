/**
 * Spacing Constants
 * 
 * Compact 4px/8px spacing system for consistent, tight spacing across the mobile UI.
 * All values follow a 4px or 8px increment scale for visual consistency.
 */

// Base spacing scale (4px/8px increments)
export const spacing = {
  xs: 4,   // Tight spacing between related elements
  sm: 8,   // Standard spacing between items
  md: 12,  // Section padding, card padding
  lg: 16,  // Larger sections, major gaps
  xl: 20,  // Page-level spacing (use sparingly)
  xxl: 24, // Maximum spacing (use very sparingly)
  // Special tight spacing (for very compact layouts)
  smTight: 6, // 6px - between sm (8px) and xs (4px) for tight icon/button spacing
} as const;

// Semantic spacing tokens for common use cases
export const semanticSpacing = {
  // Container padding
  containerPadding: spacing.md,      // 12px
  containerPaddingLarge: spacing.lg, // 16px
  
  // Card spacing
  cardPadding: spacing.md,           // 12px
  cardPaddingSmall: spacing.sm,      // 8px
  cardMargin: spacing.sm,             // 8px
  cardMarginLarge: spacing.md,       // 12px
  
  // Section spacing
  sectionGap: spacing.md,            // 12px
  sectionGapLarge: spacing.lg,       // 16px
  
  // Item spacing
  itemGap: spacing.sm,                // 8px
  itemGapSmall: spacing.xs,           // 4px
  itemGapLarge: spacing.md,          // 12px
  
  // Header spacing
  headerPadding: spacing.md,         // 12px
  headerPaddingVertical: spacing.sm, // 8px
  
  // Button spacing
  buttonPadding: spacing.sm,         // 8px
  buttonPaddingLarge: spacing.md,    // 12px
  buttonGap: spacing.xs,             // 4px
  
  // Input spacing
  inputPadding: spacing.md,          // 12px
  inputPaddingSmall: spacing.sm,      // 8px
  inputGap: spacing.sm,              // 8px
  
  // List spacing
  listItemGap: spacing.sm,           // 8px
  listItemGapSmall: spacing.xs,      // 4px
  listPadding: spacing.md,           // 12px
  
  // Modal spacing
  modalPadding: spacing.md,          // 12px
  modalPaddingLarge: spacing.lg,      // 16px
  
  // Icon spacing
  iconPadding: spacing.xs,            // 4px
  iconPaddingSmall: 2,               // 2px (for very tight icon spacing)
  iconGap: spacing.smTight,          // 6px (for tight icon-to-icon spacing)
  
  // Tight spacing (for compact layouts)
  tightGap: spacing.smTight,         // 6px (for very tight gaps between related elements)
  tightPadding: spacing.smTight,    // 6px (for compact padding)
  
  // Border radius (for consistency)
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
  },
} as const;

// Export default spacing for convenience
export default spacing;


