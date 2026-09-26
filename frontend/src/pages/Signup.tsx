import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { FarmBackground } from '@/components/FarmTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SmartVoiceForm } from '@/components/SmartVoiceForm';
import { AlertCircle, User, Phone, MapPin, Wheat, LayoutGrid, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function InputWrapper({ icon: Icon, children }: { icon: any, children: React.ReactNode }) {
    return (
        <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <Icon className="h-4 w-4" />
            </div>
            {children}
        </div>
    );
}

export default function Signup() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [landSize, setLandSize] = useState('');
    const [location, setLocation] = useState('');
    const [crops, setCrops] = useState('');

    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login, sendOtp } = useAuth();
    const { t, language } = useLanguage();
    const navigate = useNavigate();

    const handleDataExtracted = (data: any) => {
        if (data.name) setName(data.name);
        if (data.phone) {
            const cleanPhone = data.phone.toString().replace(/[- \(\)]/g, '').replace(/^\+?91/, '');
            setPhone(cleanPhone);
        }
        if (data.land_size_acres) setLandSize(data.land_size_acres.toString());
        if (data.location) setLocation(data.location);
        if (data.crops) {
            setCrops(Array.isArray(data.crops) ? data.crops.join(', ') : data.crops);
        }
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone) {
            setError('Please provide your name and phone number minimum.');
            return;
        }

        const trimmedName = name.trim();
        if (trimmedName.toLowerCase() === 'xyz' || trimmedName.length < 2 || !/^[A-Za-z\s]+$/.test(trimmedName)) {
            setError('Please provide a valid name.');
            return;
        }

        const phoneStr = phone.trim().replace(/[- \(\)]/g, '').replace(/^\+?91/, '');
        if (!/^\d{10}$/.test(phoneStr)) {
            setError('Mobile number should be 10 digits only.');
            return;
        }

        if (landSize) {
            const landStr = landSize.trim().toLowerCase();
            if (landStr.includes('cm') || isNaN(Number(landStr))) {
                setError('Please provide a valid land size in acres (numbers only, no cm).');
                return;
            }
        }

        setError('');
        setIsLoading(true);

        const result = await sendOtp(phone, true);
        if (result.success) {
            setOtpSent(true);
            if (result.otp) {
                alert(`Your AgriHub Signup OTP is: ${result.otp}`);
            }
        } else {
            setError(result.message || 'Failed to send OTP. Please check your number.');
        }
        setIsLoading(false);
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 800));
            try {
                await fetch(`${import.meta.env.VITE_API_URL || ''}/api/profile/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name, phone, land_size_acres: landSize, location, 
                        crops: crops.split(',').map(c => c.trim()).filter(c => c)
                    })
                });
            } catch (err) {
                console.warn('Failed to save profile on backend during signup.');
            }

            // Cache profile in localStorage so Profile page always has data
            localStorage.setItem('user_name', name);
            localStorage.setItem('user_land_size', landSize);
            localStorage.setItem('user_location', location);
            localStorage.setItem('user_crops', crops);

            const success = await login(phone, otp);
            if (success) {
                navigate('/hardware-setup');
            } else {
                setError('Failed to verify OTP. Please try again.');
            }
        } catch {
            setError('An error occurred. Please try again.');
        }

        setIsLoading(false);
    };


    return (
        <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-cover bg-center" 
                style={{ 
                    backgroundImage: 'url(/frames/ezgif-frame-284.jpg)',
                    backgroundSize: '100% 100%',
                    filter: 'brightness(0.7)' 
                }} 
            />

            {/* Top controls */}
            <div className="absolute top-6 right-6 z-50 flex gap-4">
                <ThemeToggle />
                <LanguageSelector />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-4xl"
            >
                <Card className="w-full bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 border-border shadow-2xl">
                    <CardHeader className="text-center pb-6">
                        <CardTitle className="text-4xl font-bold tracking-tight">
                            {t('signup_title')}
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                            {t('signup_subtitle')}
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
                        {/* LEFT COLUMN: Voice Input Section */}
                        <div className="md:col-span-5 flex flex-col justify-center space-y-6">
                            <SmartVoiceForm 
                                title="Quick Voice Setup"
                                description="Tap the microphone and speak your name, phone number, land size in acres, location, and crops grown."
                                endpoint="/api/voice/process"
                                onDataExtracted={handleDataExtracted}
                                lang={language === 'en' ? 'en-IN' : `${language}-IN`}
                            />
                            
                            <AnimatePresence>
                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }} 
                                        animate={{ opacity: 1, height: "auto" }} 
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-center gap-2 text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive/20 text-sm font-medium overflow-hidden"
                                    >
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span>{error}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* RIGHT COLUMN: Manual Form Section */}
                        <div className="md:col-span-7">
                            <form className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">{t('signup_full_name')}</Label>
                                        <InputWrapper icon={User}>
                                            <Input 
                                                id="name" type="text" value={name} 
                                                onChange={(e) => setName(e.target.value)} 
                                                placeholder="e.g. Rahul Kumar" 
                                                disabled={otpSent} 
                                                required 
                                                className="pl-9 h-11 bg-background/50" 
                                            />
                                        </InputWrapper>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">{t('phone_number')}</Label>
                                        <InputWrapper icon={Phone}>
                                            <Input 
                                                id="phone" type="tel" value={phone} 
                                                onChange={(e) => setPhone(e.target.value)} 
                                                placeholder="+91 XXXXX XXXXX" 
                                                disabled={otpSent} 
                                                required 
                                                className="pl-9 h-11 bg-background/50" 
                                            />
                                        </InputWrapper>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="landSize">{t('signup_land_size')}</Label>
                                        <InputWrapper icon={LayoutGrid}>
                                            <Input 
                                                id="landSize" type="text" value={landSize} 
                                                onChange={(e) => setLandSize(e.target.value)} 
                                                placeholder="e.g. 5.5" 
                                                disabled={otpSent} 
                                                className="pl-9 h-11 bg-background/50" 
                                            />
                                        </InputWrapper>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="location">{t('location')}</Label>
                                        <InputWrapper icon={MapPin}>
                                            <Input 
                                                id="location" type="text" value={location} 
                                                onChange={(e) => setLocation(e.target.value)} 
                                                placeholder="State / District" 
                                                disabled={otpSent} 
                                                className="pl-9 h-11 bg-background/50" 
                                            />
                                        </InputWrapper>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="crops">{t('signup_crops')}</Label>
                                    <InputWrapper icon={Wheat}>
                                        <Input 
                                            id="crops" type="text" value={crops} 
                                            onChange={(e) => setCrops(e.target.value)} 
                                            placeholder="Wheat, Rice, Sugarcane..." 
                                            disabled={otpSent} 
                                            className="pl-9 h-11 bg-background/50" 
                                        />
                                    </InputWrapper>
                                </div>

                                {/* OTP */}
                                <AnimatePresence>
                                    {otpSent && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0, scale: 0.95 }} 
                                            animate={{ opacity: 1, height: "auto", scale: 1 }} 
                                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                            className="space-y-3 pt-6 border-t mt-6 origin-top"
                                        >
                                            <Label htmlFor="otp" className="text-primary font-medium">{t('otp_label')}</Label>
                                            <div className="flex justify-center pt-2">
                                                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                                                    <InputOTPGroup>
                                                        <InputOTPSlot index={0} className="h-12 w-12 text-lg border-2" />
                                                        <InputOTPSlot index={1} className="h-12 w-12 text-lg border-2" />
                                                        <InputOTPSlot index={2} className="h-12 w-12 text-lg border-2" />
                                                        <InputOTPSlot index={3} className="h-12 w-12 text-lg border-2" />
                                                        <InputOTPSlot index={4} className="h-12 w-12 text-lg border-2" />
                                                        <InputOTPSlot index={5} className="h-12 w-12 text-lg border-2" />
                                                    </InputOTPGroup>
                                                </InputOTP>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="pt-4">
                                    <Button
                                        type="button" 
                                        size="lg"
                                        className="w-full h-12 text-base font-semibold"
                                        onClick={otpSent ? handleSignup : handleSendOtp} 
                                        disabled={isLoading || (!otpSent && (!name || !phone)) || (otpSent && !otp)}
                                    >
                                        {isLoading
                                            ? (otpSent ? t('verifying') : t('sending_otp'))
                                            : (otpSent ? t('signup_complete') : t('signup_send_code'))}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </CardContent>
                    
                    <CardFooter className="flex justify-center border-t py-6">
                        <p className="text-sm text-muted-foreground text-center">
                            {t('have_account')}{' '}
                            <Link to="/login" className="font-semibold text-primary hover:underline underline-offset-4">
                                {t('login_here')}
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
