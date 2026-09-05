<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'phone' => ['required', 'string', 'regex:/^01\d{9}$/', Rule::unique('users', 'phone')],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
            'referral_code' => ['nullable', 'string', 'max:16', Rule::exists('users', 'referral_code')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone.required' => 'মোবাইল নাম্বার দিন',
            'phone.regex' => 'সঠিক ১১ ডিজিটের নাম্বার দিন (01XXXXXXXXX)',
            'phone.unique' => 'এই নাম্বারে আগেই অ্যাকাউন্ট আছে',
            'password.required' => 'পাসওয়ার্ড দিন',
            'password.min' => 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে',
            'password.confirmed' => 'পাসওয়ার্ড মিলছে না',
            'referral_code.exists' => 'রেফারেল কোডটি সঠিক নয়',
        ];
    }
}
