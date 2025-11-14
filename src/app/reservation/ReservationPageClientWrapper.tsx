'use client';

import React from 'react';
import ReservationClient from './ReservationClient';

/**
 * Wrapper to ensure ReservationClient is rendered within ThemeProvider context.
 * This allows useLightMode hook to work properly.
 */
export default function ReservationPageClientWrapper() {
    return <ReservationClient />;
}
