export interface ApiErrorBody {
    error: {
        code: string;
        message: string;
        fields?: Record<string, string>;
        details?: TestAnswerError[];
    };
}

export type Sex = 'male' | 'female';

export type SearchSex = Sex | 'all';

export type DatingGoal = 'relationship' | 'friendship' | 'casual';

export type Education = 'secondary' | 'vocational' | 'incomplete_higher' | 'higher' | 'degree';

export type Attitude = 'negative' | 'neutral' | 'positive';

export type TagKey =
    | 'coffee'
    | 'books'
    | 'music'
    | 'hiking'
    | 'bicycle'
    | 'travel'
    | 'photo'
    | 'board_games'
    | 'cooking'
    | 'running'
    | 'painting'
    | 'movies'
    | 'concerts'
    | 'animals';

export type MissingField =
    'name' | 'birth_date' | 'sex' | 'dating_goal' | 'search_filter' | 'photos';

export interface Credentials {
    email: string;
    password: string;
}

export interface AuthResponse {
    user_id: number;
    missing: MissingField[];
}

export interface Photo {
    id: number;
    url: string;
}

export interface PhotosResponse {
    photos: Photo[];
}

export interface ReorderPhotosRequest {
    photo_ids: Photo['id'][];
}

export interface ProfileShort {
    user_id: number;
    name: string | null;
    age: number | null;
    city: string | null;
    photo_url: Photo['url'] | null;
    missing: MissingField[];
}

export interface Profile extends UserFacts {
    user_id: number;
    name: string | null;
    birth_date: string | null;
    age: number | null;
    sex: Sex | null;
    about_me: string | null;
    education: Education | null;
    tags: TagKey[];
    photos: Photo[];
    missing: MissingField[];
}

export interface UpdateProfileRequest {
    name?: string;
    birth_date?: string;
    sex?: Sex;
    dating_goal?: DatingGoal;
    about_me?: string | null;
    education?: Education | null;
    work?: string | null;
    smoking?: Attitude | null;
    alcohol?: Attitude | null;
    height?: number | null;
    tags?: TagKey[];
}

export interface SearchFilter {
    sex: SearchSex;
    age_from: number;
    age_to: number;
}

export type FeedCursor = number;

export interface FeedParams {
    limit?: number;
    cursor?: FeedCursor;
}

export interface UserFacts {
    education: Education | null;
    work: string | null;
    smoking: Attitude | null;
    alcohol: Attitude | null;
    height: number | null;
    dating_goal: DatingGoal;
}

export interface FeedItem extends UserFacts {
    user_id: number;
    name: string;
    age: number;
    city: string | null;
    about_me: string | null;
    compatibility: number | null;
    tags: TagKey[];
    photos: Photo[];
    liked_me: boolean;
}

export interface FeedPage {
    items: FeedItem[];
    next_cursor: FeedCursor | null;
}

export type SwipeAction = 'like' | 'dislike' | 'super';

export interface SwipeRequest {
    target_user_id: FeedItem['user_id'];
    action: SwipeAction;
}

export interface AnswerOption {
    value: number;
    label: string;
}

export interface TestQuestion {
    id: string;
    body: string;
}

export interface CompatibilityTest {
    test_id: '1';
    title: string;
    instructions: string;
    answer_options: AnswerOption[];
    questions: TestQuestion[];
}

export interface TestAnswer {
    question_id: TestQuestion['id'];
    value: AnswerOption['value'];
}

export interface SendTestResultsRequest {
    answers: TestAnswer[];
}

export interface TestAnswerError {
    question_id: TestQuestion['id'];
    code: 'MISSING_ANSWER' | 'DUPLICATE_QUESTION' | 'QUESTION_NOT_IN_TEST' | 'VALUE_OUT_OF_RANGE';
}

export interface BigFive {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
}

export type PersonalityType =
    | 'EXPLORER'
    | 'VISIONARY'
    | 'STRATEGIST'
    | 'INVENTOR'
    | 'DREAMER'
    | 'CURATOR'
    | 'INSPIRER'
    | 'DEBATER'
    | 'ORGANIZER'
    | 'CONNECTOR'
    | 'COMPANION'
    | 'DRIVER'
    | 'ANCHOR'
    | 'CRAFTSPERSON'
    | 'OBSERVER'
    | 'KEEPER';

export interface TestResult {
    result_id: string;
    test_id: CompatibilityTest['test_id'];
    revision: number;
    completed_at: string;
    big_five: BigFive;
    personality_type: PersonalityType;
    about_personality_type: string;
}
