/**
 * Built-in production-grade templates for zero-framework chatbot creator
 */

export const TEMPLATES = [
  {
    id: 'customer_support',
    name: 'Customer Support Assistant',
    category: 'Support',
    badge: 'Popular',
    description: 'Resolves common customer queries, tracks orders, explains policies, and escalates to human agents.',
    icon: 'headset',
    config: {
      identity: {
        assistantName: 'Support Hero',
        businessName: 'Nova Retail',
        businessCategory: 'Customer Support',
        role: 'Customer Support Specialist',
        personality: 'friendly',
        tone: 'empathetic',
        fallbackMessage: "I'm not completely certain about that. Let me connect you with our human team so you get the exact right answer.",
        errorMessage: "I encountered a brief connection hiccup. Please try asking again.",
        handoffMessage: "Transferring you to an available customer support representative. One moment please...",
        endingMessage: "Thank you for reaching out! Is there anything else we can assist you with?"
      },
      appearance: {
        primaryColor: '#2563eb',
        secondaryColor: '#1d4ed8',
        theme: 'light',
        position: 'bottom-right',
        launcherIcon: 'headset',
        launcherText: 'Customer Support'
      },
      welcomeExperience: {
        greeting: "Hello there! 👋 Welcome to Nova Support. How may we assist you today?",
        conversationStarters: [
          "Check order status",
          "Return & refund policy",
          "Speak with an agent"
        ]
      },
      knowledgeBase: [
        {
          id: 'kb_order_status',
          question: 'How do I track my order status?',
          answer: 'You can check your order status anytime by clicking the tracking link sent in your confirmation email, or provide your order number here!',
          category: 'Orders',
          keywords: ['track', 'order', 'status', 'shipping', 'package', 'delivery'],
          priority: 5
        },
        {
          id: 'kb_returns',
          question: 'What is your return policy?',
          answer: 'We provide a 30-day hassle-free return window on all unworn, original condition items with tags attached.',
          category: 'Returns',
          keywords: ['return', 'refund', 'exchange', 'policy', 'money back'],
          priority: 5
        },
        {
          id: 'kb_shipping_time',
          question: 'How long does shipping take?',
          answer: 'Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days across North America.',
          category: 'Shipping',
          keywords: ['shipping', 'delivery', 'time', 'days', 'speed', 'fast'],
          priority: 4
        }
      ]
    }
  },
  {
    id: 'faq_bot',
    name: 'Instant FAQ Assistant',
    category: 'Information',
    badge: 'Quick Setup',
    description: 'Knowledge base bot answering frequent questions regarding services, pricing, and operating rules.',
    icon: 'chat',
    config: {
      identity: {
        assistantName: 'FAQ Bot',
        businessName: 'Nexus Cloud',
        businessCategory: 'Cloud Services',
        role: 'Knowledge Guide',
        personality: 'conversational',
        tone: 'concise',
        fallbackMessage: "I don't have that specific FAQ in my records yet. Feel free to contact our helpdesk directly.",
        errorMessage: "An error occurred while looking up that question.",
        handoffMessage: "Let me redirect you to our extended documentation and help desk.",
        endingMessage: "Hope that answers your questions! Have a great day."
      },
      appearance: {
        primaryColor: '#059669',
        secondaryColor: '#047857',
        theme: 'light',
        position: 'bottom-right',
        launcherIcon: 'chat',
        launcherText: 'Ask a Question'
      },
      welcomeExperience: {
        greeting: "Welcome to our knowledge center! What question can I answer for you?",
        conversationStarters: [
          "What pricing plans are available?",
          "How does data privacy work?",
          "Can I cancel anytime?"
        ]
      },
      knowledgeBase: [
        {
          id: 'kb_pricing',
          question: 'What pricing plans are available?',
          answer: 'We offer Starter ($19/mo), Pro ($49/mo), and Enterprise tiers. All plans include a 14-day free trial with no credit card required.',
          category: 'Pricing',
          keywords: ['pricing', 'plans', 'cost', 'subscription', 'tiers', 'price'],
          priority: 5
        },
        {
          id: 'kb_cancellation',
          question: 'Can I cancel my subscription at any time?',
          answer: 'Yes! You can cancel or pause your subscription directly from your billing dashboard at any time with zero penalties.',
          category: 'Billing',
          keywords: ['cancel', 'cancellation', 'unsubscribe', 'stop'],
          priority: 5
        }
      ]
    }
  },
  {
    id: 'ecommerce_assistant',
    name: 'E-Commerce Shopping Assistant',
    category: 'Sales',
    badge: 'High Conversion',
    description: 'Recommends products, answers inventory questions, and assists shoppers through checkout.',
    icon: 'sparkle',
    config: {
      identity: {
        assistantName: 'ShopBot',
        businessName: 'Aura Lifestyle',
        businessCategory: 'E-commerce',
        role: 'Personal Shopping Concierge',
        personality: 'friendly',
        tone: 'empathetic',
        fallbackMessage: "I couldn't locate that item. Tell me what style or category you are looking for!",
        errorMessage: "Oops, something went wrong with the shopping catalog.",
        handoffMessage: "Let me connect you with a personal shopping stylist.",
        endingMessage: "Enjoy your shopping! Let me know if you need any other recommendations."
      },
      appearance: {
        primaryColor: '#7c3aed',
        secondaryColor: '#6d28d9',
        theme: 'light',
        position: 'bottom-right',
        launcherIcon: 'sparkle',
        launcherText: 'Shopping Assistant'
      },
      welcomeExperience: {
        greeting: "Hi there! ✨ Looking for something special today? I can help find the perfect product or deal.",
        conversationStarters: [
          "Show trending items",
          "Do you offer free shipping?",
          "Current discount codes"
        ]
      },
      knowledgeBase: [
        {
          id: 'kb_discounts',
          question: 'Are there any active discount codes or sales?',
          answer: 'Yes! Use code WELCOME10 at checkout to get 10% off your first order over $50.',
          category: 'Promotions',
          keywords: ['discount', 'coupon', 'promo', 'code', 'sale', 'deal', 'offer'],
          priority: 5
        },
        {
          id: 'kb_free_ship',
          question: 'Do you offer free shipping?',
          answer: 'All domestic orders over $75 qualify for complimentary standard express shipping.',
          category: 'Shipping',
          keywords: ['free', 'shipping', 'delivery', 'cost', 'minimum'],
          priority: 5
        }
      ]
    }
  },
  {
    id: 'lead_generation',
    name: 'Lead Qualification Assistant',
    category: 'Marketing',
    badge: 'B2B Ready',
    description: 'Engages inbound visitors, qualifies prospective leads, and captures contact information.',
    icon: 'robot',
    config: {
      identity: {
        assistantName: 'GrowthBot',
        businessName: 'Apex Advisory',
        businessCategory: 'Consulting',
        role: 'Client Intake Specialist',
        personality: 'professional',
        tone: 'formal',
        fallbackMessage: "I understand. Would you like to leave your email so an advisor can discuss your custom requirements?",
        errorMessage: "Intake form encountered an issue.",
        handoffMessage: "Forwarding your inquiry to our senior account director.",
        endingMessage: "Thank you for considering Apex Advisory. We will be in touch shortly."
      },
      appearance: {
        primaryColor: '#0f172a',
        secondaryColor: '#334155',
        theme: 'dark',
        position: 'bottom-right',
        launcherIcon: 'robot',
        launcherText: 'Schedule Consultation'
      },
      welcomeExperience: {
        greeting: "Hello. Welcome to Apex Advisory. Are you looking to scale your team or optimize business operations?",
        conversationStarters: [
          "Request a proposal",
          "Book a consultation",
          "Our advisory services"
        ]
      },
      knowledgeBase: [
        {
          id: 'kb_consulting_services',
          question: 'What advisory services do you provide?',
          answer: 'We specialize in enterprise digital transformation, cloud architecture migration, and business automation.',
          category: 'Services',
          keywords: ['services', 'consulting', 'advisory', 'transformation', 'offer'],
          priority: 5
        }
      ]
    }
  },
  {
    id: 'booking_assistant',
    name: 'Booking & Appointment Scheduler',
    category: 'Booking',
    badge: 'Scheduling',
    description: 'Guides clients through appointment booking, schedules consultations, and collects booking details.',
    icon: 'chat',
    config: {
      identity: {
        assistantName: 'CalendarBot',
        businessName: 'Luminary Clinic',
        businessCategory: 'Health & Wellness',
        role: 'Reception Coordinator',
        personality: 'friendly',
        tone: 'empathetic',
        fallbackMessage: "I'd love to help you book. Please choose a service or let me know what day works best.",
        errorMessage: "Scheduling system temporarily unavailable.",
        handoffMessage: "Connecting you to our front desk receptionist.",
        endingMessage: "We look forward to seeing you at your appointment!"
      },
      appearance: {
        primaryColor: '#0891b2',
        secondaryColor: '#0e7490',
        theme: 'light',
        position: 'bottom-right',
        launcherIcon: 'chat',
        launcherText: 'Book Appointment'
      },
      welcomeExperience: {
        greeting: "Welcome to Luminary Clinic! Ready to schedule your next wellness visit or consultation?",
        conversationStarters: [
          "Book an appointment",
          "Clinic location and parking",
          "What to bring to visit"
        ]
      },
      knowledgeBase: [
        {
          id: 'kb_location',
          question: 'Where is your clinic located and is there parking?',
          answer: 'We are located at 450 Health Avenue, Suite 300. Complimentary validated parking is available in the underground garage.',
          category: 'Location',
          keywords: ['location', 'address', 'parking', 'where', 'directions'],
          priority: 5
        }
      ]
    }
  },
  {
    id: 'technical_support',
    name: 'Technical Support Assistant',
    category: 'Technical',
    badge: 'Developer',
    description: 'Troubleshoots technical issues, API questions, authentication errors, and system status.',
    icon: 'robot',
    config: {
      identity: {
        assistantName: 'DevBot',
        businessName: 'StackEngine',
        businessCategory: 'Developer Platform',
        role: 'Technical Support Engineer',
        personality: 'technical',
        tone: 'concise',
        fallbackMessage: "Unable to match that error code or query. Please check our API docs or submit a GitHub issue.",
        errorMessage: "Diagnostic query failed.",
        handoffMessage: "Escalating ticket to Level 2 On-Call Engineering.",
        endingMessage: "Happy coding! Let us know if you hit any other snags."
      },
      appearance: {
        primaryColor: '#3b82f6',
        secondaryColor: '#1d4ed8',
        theme: 'dark',
        position: 'bottom-right',
        launcherIcon: 'robot',
        launcherText: 'API & Tech Support'
      },
      welcomeExperience: {
        greeting: "Hey developer! 💻 Having trouble with SDK integration or API endpoints? Let's debug it together.",
        conversationStarters: [
          "API rate limits & authentication",
          "Webhook verification troubleshooting",
          "System status & uptime"
        ]
      },
      knowledgeBase: [
        {
          id: 'kb_ratelimits',
          question: 'What are the API rate limits?',
          answer: 'Standard tier allows 100 requests per second. Authenticate using Bearer tokens in the Authorization header.',
          category: 'API',
          keywords: ['rate', 'limit', 'auth', 'api', 'token', 'quota'],
          priority: 5
        }
      ]
    }
  },
  {
    id: 'business_info',
    name: 'Business Information Assistant',
    category: 'Business',
    badge: 'Essential',
    description: 'Provides company overview, team background, business credentials, and office directions.',
    icon: 'chat',
    config: {
      identity: {
        assistantName: 'InfoDesk',
        businessName: 'Veritas Holdings',
        businessCategory: 'Corporate',
        role: 'Information Specialist',
        personality: 'professional',
        tone: 'formal',
        fallbackMessage: "Our office directories do not show that item. Please call our central switchboard.",
        errorMessage: "Directory service temporary error.",
        handoffMessage: "Forwarding call to executive administration.",
        endingMessage: "Thank you for your interest in Veritas Holdings."
      },
      appearance: {
        primaryColor: '#475569',
        secondaryColor: '#334155',
        theme: 'light',
        position: 'bottom-right',
        launcherIcon: 'chat',
        launcherText: 'Business Info'
      },
      welcomeExperience: {
        greeting: "Welcome to Veritas Holdings corporate portal. How may I direct your inquiry?",
        conversationStarters: [
          "Corporate headquarters & contact",
          "Investor relations overview",
          "Media and press inquiries"
        ]
      },
      knowledgeBase: [
        {
          id: 'kb_hq',
          question: 'Where is Veritas corporate headquarters?',
          answer: 'Veritas Holdings is headquartered in Boston, MA at 100 Financial Way.',
          category: 'Corporate',
          keywords: ['headquarters', 'hq', 'boston', 'office', 'address'],
          priority: 5
        }
      ]
    }
  },
  {
    id: 'educational_assistant',
    name: 'Educational Tutor & Course Guide',
    category: 'Education',
    badge: 'Learning',
    description: 'Assists students and course participants with syllabus questions, assignments, and study materials.',
    icon: 'sparkle',
    config: {
      identity: {
        assistantName: 'StudyBot',
        businessName: 'Polymath Academy',
        businessCategory: 'Online Education',
        role: 'Learning Mentor',
        personality: 'friendly',
        tone: 'empathetic',
        fallbackMessage: "That question isn't in our current lesson syllabus. Ask your instructor during weekly office hours!",
        errorMessage: "Course portal connection reset.",
        handoffMessage: "Connecting with teaching assistant.",
        endingMessage: "Keep up the great study momentum!"
      },
      appearance: {
        primaryColor: '#ea580c',
        secondaryColor: '#c2410c',
        theme: 'light',
        position: 'bottom-right',
        launcherIcon: 'sparkle',
        launcherText: 'Study Guide'
      },
      welcomeExperience: {
        greeting: "Hello student! 📚 Ready to dive into your courses today? Ask me anything about syllabus or schedules.",
        conversationStarters: [
          "When are homework assignments due?",
          "How to access lecture recordings?",
          "Office hours schedule"
        ]
      },
      knowledgeBase: [
        {
          id: 'kb_office_hours',
          question: 'When are instructor office hours?',
          answer: 'Office hours are held every Tuesday and Thursday from 4:00 PM to 6:00 PM EST via the Zoom link in the student portal.',
          category: 'Schedule',
          keywords: ['office', 'hours', 'instructor', 'tutor', 'zoom', 'help'],
          priority: 5
        }
      ]
    }
  }
];
