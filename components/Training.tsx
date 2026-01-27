import React, { useState } from 'react';
import { COURSES } from '../data';
import { Course } from '../types';
import { GraduationCap, Clock, CheckCircle2, BookOpen, ArrowLeft, Award } from 'lucide-react';

export const Training: React.FC = () => {
    const [activeCourse, setActiveCourse] = useState<Course | null>(null);

    if (activeCourse) {
        return (
            <div className="max-w-4xl mx-auto p-6 lg:p-10">
                <button 
                    onClick={() => setActiveCourse(null)}
                    className="flex items-center space-x-2 text-slate-500 hover:text-[#334155] font-bold mb-6 transition-colors"
                >
                    <ArrowLeft size={18} />
                    <span>Back to Training Hub</span>
                </button>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="h-48 bg-[#334155] relative flex items-center justify-center">
                         <GraduationCap className="text-white/20 w-32 h-32 absolute" />
                         <div className="relative z-10 text-center p-6">
                            <span className="inline-block px-3 py-1 rounded-full bg-[#5DADE2] text-white text-xs font-bold mb-3 uppercase tracking-wider">
                                {activeCourse.category}
                            </span>
                            <h1 className="text-3xl font-['Montserrat'] font-bold text-white">{activeCourse.title}</h1>
                         </div>
                    </div>

                    <div className="p-8">
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                            {activeCourse.description}
                        </p>

                        <div className="grid grid-cols-3 gap-6 mb-10 border-y border-slate-100 py-6">
                            <div className="flex items-center space-x-3">
                                <Clock className="text-[#5DADE2]" size={24} />
                                <div>
                                    <div className="text-xs text-slate-500 uppercase font-bold">Duration</div>
                                    <div className="font-bold text-[#334155]">{activeCourse.duration}</div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Award className="text-[#4CAF50]" size={24} />
                                <div>
                                    <div className="text-xs text-slate-500 uppercase font-bold">Level</div>
                                    <div className="font-bold text-[#334155]">{activeCourse.level}</div>
                                </div>
                            </div>
                             <div className="flex items-center space-x-3">
                                <BookOpen className="text-amber-500" size={24} />
                                <div>
                                    <div className="text-xs text-slate-500 uppercase font-bold">Modules</div>
                                    <div className="font-bold text-[#334155]">{activeCourse.syllabus?.length || 4} Units</div>
                                </div>
                            </div>
                        </div>

                        <h3 className="font-['Montserrat'] font-bold text-xl text-[#334155] mb-4">Course Syllabus</h3>
                        <div className="space-y-3 mb-8">
                            {activeCourse.syllabus?.map((item, idx) => (
                                <div key={idx} className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <div className="mt-0.5">
                                        <CheckCircle2 size={18} className="text-[#4CAF50]" />
                                    </div>
                                    <span className="text-slate-700 font-medium">{item}</span>
                                </div>
                            ))}
                        </div>

                        <button className="w-full bg-[#334155] text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 shadow-lg transition-all">
                            Enroll Now
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 lg:p-10">
            <div className="mb-8">
                <h1 className="text-3xl font-['Montserrat'] font-bold text-[#334155]">Verdaxis Academy</h1>
                <p className="text-slate-500 mt-2">Certify your crew for alternative fuels and regulatory compliance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {COURSES.map((course) => (
                    <div key={course.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                        <div className="h-32 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#5DADE2]/20 to-transparent"></div>
                            <GraduationCap size={48} className="text-slate-300 relative z-10" />
                            <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded text-xs font-bold text-slate-500 z-10 shadow-sm">
                                {course.category}
                            </div>
                        </div>
                        
                        <div className="p-6 flex flex-col flex-1">
                            <div className="flex items-center space-x-2 text-xs text-[#5DADE2] font-bold mb-2">
                                <Clock size={12} />
                                <span>{course.duration}</span>
                                <span>•</span>
                                <span>{course.level}</span>
                            </div>
                            <h3 className="font-['Montserrat'] font-bold text-lg text-[#334155] mb-2 line-clamp-2">
                                {course.title}
                            </h3>
                            <p className="text-sm text-slate-500 mb-4 line-clamp-3 flex-1">
                                {course.description}
                            </p>
                            <button 
                                onClick={() => setActiveCourse(course)}
                                className="w-full border border-[#334155] text-[#334155] py-2 rounded-lg font-bold hover:bg-[#334155] hover:text-white transition-colors"
                            >
                                View Course
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};