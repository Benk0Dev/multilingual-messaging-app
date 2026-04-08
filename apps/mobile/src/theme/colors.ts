export const lightColors = {
    // Primary (terracotta)
    primary: '#C36A37',
    primaryLight: '#D4894F',
    primaryDark: '#A35428',
    primarySubtle: '#F5EDE4',
  
    // Secondary (teal)
    secondary: '#2E7D6B',
    secondaryLight: '#58C7AD',
    secondaryDark: '#1D5C4E',
    secondarySubtle: '#E6F5F0',
  
    // Surfaces
    bg: '#FAF5EF',
    card: '#FFFFFF',
    headerBg: '#F0E6DA',
    inputBg: '#F5EDE4',
    searchBarBg: '#FFFFFF',
  
    // Text
    textPrimary: '#1A1A18',
    textSecondary: '#7A7670',
    textTertiary: '#A8A49E',
    textOnPrimary: '#FFFFFF',
    textOnPrimaryMuted: 'rgba(255,255,255,0.6)',
  
    // Borders
    border: '#E8E0D6',
    borderLight: '#F0E8DE',
    divider: '#E8E0D6',
  
    // Message bubbles
    sentBubble: '#C36A37',
    receivedBubble: '#FFFFFF',
    receivedBorder: '#E8E0D6',
  
    // Status indicators
    receiptRead: '#58C7AD',
    receiptDelivered: '#A8A49E',
    online: '#58C7AD',
    error: '#D14520',
    warning: '#D4940A',
  
    // Misc UI
    datePill: '#EDE5DB',
    datePillText: '#7A7670',
    navBg: '#FFFFFF',
    navBorder: '#E8E0D6',
    otpBoxBg: '#FFFFFF',
    otpBoxBorder: '#E8E0D6',
    otpBoxFocus: '#C36A37',
};
  
export const darkColors: typeof lightColors = {
    primary: '#D4894F',
    primaryLight: '#E8A46A',
    primaryDark: '#C36A37',
    primarySubtle: '#2E2218',
  
    secondary: '#58C7AD',
    secondaryLight: '#52C4A8',
    secondaryDark: '#2E7D6B',
    secondarySubtle: '#1A2E28',
  
    bg: '#121110',
    card: '#1E1D1B',
    headerBg: '#1E1D1B',
    inputBg: '#2A2826',
    searchBarBg: '#2A2826',
  
    textPrimary: '#EDEBE7',
    textSecondary: '#8A867F',
    textTertiary: '#5E5B56',
    textOnPrimary: '#FFFFFF',
    textOnPrimaryMuted: 'rgba(255,255,255,0.55)',
  
    border: '#333130',
    borderLight: '#2A2826',
    divider: '#2A2826',
  
    sentBubble: '#D4894F',
    receivedBubble: '#1E1D1B',
    receivedBorder: '#333130',
  
    receiptRead: '#52C4A8',
    receiptDelivered: '#5E5B56',
    online: '#52C4A8',
    error: '#E8633D',
    warning: '#E8A832',
  
    datePill: '#2A2826',
    datePillText: '#8A867F',
    navBg: '#1E1D1B',
    navBorder: '#333130',
    otpBoxBg: '#2A2826',
    otpBoxBorder: '#333130',
    otpBoxFocus: '#D4894F',
};
  
  // Deterministic avatar colors - pick based on hash of userId
export const avatarPalette = [
    '#2E7D6B', // teal
    '#C36A37', // terracotta
    '#8B6F47', // warm brown
    '#6B7C8B', // slate
];
  
export type ThemeColors = typeof lightColors;
  