import type { QuoteRequest } from '../types';

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Mock API call to submit quote request
 */
export async function submitQuoteRequest(request: QuoteRequest): Promise<ApiResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Log the request data (in real app, this would be sent to server)
  console.log('Quote Request Submitted:', {
    contact: {
      name: request.name,
      company: request.companyName,
      email: request.email,
      telephone: request.telephone,
    },
    dimensions: request.dimensions,
    load: request.load,
    accessories: request.accessories,
    postalCode: request.postalCode,
    pricing: request.pricing,
    note: request.note,
    picturesCount: request.pictures?.length || 0,
  });

  // Simulate random success/failure (90% success rate)
  const success = Math.random() > 0.1;

  if (success) {
    return {
      success: true,
      message: 'Quote request submitted successfully! We will contact you soon.',
      data: {
        requestId: `REQ-${Date.now()}`,
        submittedAt: new Date().toISOString(),
      },
    };
  } else {
    return {
      success: false,
      message: 'Failed to submit quote request. Please try again later.',
    };
  }
}

